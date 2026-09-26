"use client"
import React,{ useEffect, useState } from 'react'
import axios from 'axios'
import { UserDetailContext } from '@/context/UserDetailContext';
function Provider({children}: {children: React.ReactNode}) {
const [userDetails, setUserDetails] = useState(null);
    useEffect(() => {
      CreateNewUser();
    }, []);
  const CreateNewUser=async ()=>{
    //user API endpooint to create a new user
    const result = await axios.post('/api/user',{});
    console.log(result.data);
    setUserDetails(result?.data);
  }
    return (
    <UserDetailContext.Provider value={{ userDetails, setUserDetails }}>
      <div className="flex flex-col flex-1 w-full">
        {children}
      </div>
    </UserDetailContext.Provider>
  )
}

export default Provider
